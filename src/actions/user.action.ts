"use server"

import { prisma } from "@/lib/prisma"
import { auth, currentUser } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

// NOTE: Get the User from Clerk and save it to the database
const syncUser = async () => {
	try {
		const { userId } = await auth()
		const user = await currentUser()

		if (!userId || !user) return

		// Check if the user already exists in the database
		const existingUser = await prisma.user.findUnique({
			where: {
				clerkId: userId,
			},
		})

		if (existingUser) return existingUser

		const dbUser = await prisma.user.create({
			data: {
				clerkId: userId,
				name: `${user.firstName || ""} ${user.lastName || ""}`,
				username: user.username ?? user.emailAddresses[0].emailAddress.split("@")[0],
				email: user.emailAddresses[0].emailAddress,
				image: user.imageUrl,
			},
		})

		return dbUser
	} catch (error) {
		console.log("Error syncing user:", error)
	}
}

const getUserByClerkId = (clerkId: string) => {
	return prisma.user.findUnique({
		where: {
			clerkId,
		},
		include: {
			_count: {
				select: {
					followers: true,
					following: true,
					posts: true,
				},
			},
		},
	})
}

const getDbUserId = async () => {
	const { userId: clerkId } = await auth()
	if (!clerkId) return null

	const user = await getUserByClerkId(clerkId)

	if (!user) throw new Error("User not found")

	return user.id
}

const getRandomUser = async () => {
	try {
		const userId = await getDbUserId()

		if (!userId) return []

		// NOTE: get 3 random users exclude ourselves & users we are already following
		// NOTE: Ở đây tức là tìm những người dùng mà người theo dõi không phải là chính mình và chưa theo dõi
		const randomUsers = await prisma.user.findMany({
			where: {
				AND: [{ NOT: { id: userId } }, { NOT: { followers: { some: { followerId: userId } } } }],
			},
			select: {
				id: true,
				name: true,
				username: true,
				image: true,
				_count: {
					select: {
						followers: true,
					},
				},
			},
			take: 3,
		})

		return randomUsers
	} catch (error) {
		console.log("Error getting random users:", error)
		return []
	}
}

const toggleFollow = async (targetUserId: string) => {
	try {
		const userId = await getDbUserId()

		if (!userId) return
		if (userId === targetUserId) throw new Error("Cannot follow yourself")

		const existingFollow = await prisma.follows.findUnique({
			where: {
				followerId_followingId: {
					followerId: userId,
					followingId: targetUserId,
				},
			},
		})

		if (existingFollow) {
			await prisma.follows.delete({
				where: {
					followerId_followingId: {
						followerId: userId,
						followingId: targetUserId,
					},
				},
			})
		} else {
			await prisma.$transaction([
				prisma.follows.create({
					data: {
						followerId: userId,
						followingId: targetUserId,
					},
				}),
				prisma.notification.create({
					data: {
						type: "FOLLOW",
						userId: targetUserId, // NOTE: The user that is being followed
						creatorId: userId,
					},
				}),
			])
		}

		revalidatePath("/") // INFO: revalidate the cache for the home page
		return { success: true }
	} catch (error) {
		console.log("Error toggling follow:", error)
		return { success: false, error: "Error toggling follow" }
	}
}

export { syncUser, getUserByClerkId, getDbUserId, getRandomUser, toggleFollow }
