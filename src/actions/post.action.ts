"use server"

import { getDbUserId } from "./user.action"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const createPost = async (content: string, imageUrl: string) => {
	try {
		const userId = await getDbUserId()
		if (!userId) return

		const post = await prisma.post.create({
			data: {
				content,
				image: imageUrl,
				authorId: userId,
			},
		})

		revalidatePath("/") // INFO: revalidate the cache for the home page
		return { success: true, post }
	} catch (error) {
		console.log("Error creating post:", error)
		return { success: false, error: "Failed to create post" }
	}
}

const getPosts = async () => {
	try {
		const posts = await prisma.post.findMany({
			orderBy: {
				createdAt: "desc",
			},
			include: {
				author: {
					select: {
						id: true,
						name: true,
						username: true,
						image: true,
					},
				},
				comments: {
					include: {
						author: {
							select: {
								id: true,
								name: true,
								username: true,
								image: true,
							},
						},
					},
					orderBy: {
						createdAt: "asc",
					},
				},
				likes: {
					select: {
						userId: true,
					},
				},
				_count: {
					select: {
						comments: true,
						likes: true,
					},
				},
			},
		})

		return posts
	} catch (error) {
		console.log("Error getting posts:", error)
		return []
	}
}

const toggleLike = async (postId: string, urlPath: string) => {
	try {
		const userId = await getDbUserId()
		if (!userId) return

		// check if like exists
		const existingLike = await prisma.like.findUnique({
			where: {
				userId_postId: {
					userId,
					postId,
				},
			},
		})

		const post = await prisma.post.findUnique({
			where: { id: postId },
			select: { authorId: true },
		})

		if (!post) throw new Error("Post not found")

		if (existingLike) {
			// unlike
			await prisma.like.delete({
				where: {
					userId_postId: {
						userId,
						postId,
					},
				},
			})
		} else {
			// like and create notification (only if liking someone else's post)
			await prisma.$transaction([
				prisma.like.create({
					data: {
						userId,
						postId,
					},
				}),
				...(post.authorId !== userId
					? [
							prisma.notification.create({
								data: {
									type: "LIKE",
									userId: post.authorId, // recipient (post author)
									creatorId: userId, // person who liked
									postId,
								},
							}),
					  ]
					: []),
			])
		}

		revalidatePath(urlPath)
		return { success: true }
	} catch (error) {
		console.error("Failed to toggle like:", error)
		return { success: false, error: "Failed to toggle like" }
	}
}

const createComment = async (postId: string, content: string) => {
	try {
		const userId = await getDbUserId()

		if (!userId) return
		if (!content) throw new Error("Content is required")

		const post = await prisma.post.findUnique({
			where: { id: postId },
			select: { authorId: true },
		})

		if (!post) throw new Error("Post not found")

		// Create comment and notification in a transaction
		const [comment] = await prisma.$transaction(async (tx) => {
			// Create comment first
			const newComment = await tx.comment.create({
				data: {
					content,
					authorId: userId,
					postId,
				},
			})

			// Create notification if commenting on someone else's post
			if (post.authorId !== userId) {
				await tx.notification.create({
					data: {
						type: "COMMENT",
						userId: post.authorId,
						creatorId: userId,
						postId,
						commentId: newComment.id,
					},
				})
			}

			return [newComment]
		})

		revalidatePath("/")
		return { success: true, comment }
	} catch (error) {
		console.error("Failed to create comment:", error)
		return { success: false, error: "Failed to create comment" }
	}
}

const deletePost = async (postId: string) => {
	try {
		const userId = await getDbUserId()
		if (!userId) return

		const post = await prisma.post.findUnique({
			where: { id: postId },
			select: { authorId: true },
		})

		if (!post) throw new Error("Post not found")
		if (post.authorId !== userId) throw new Error("Unauthorized - no delete permission")

		await prisma.post.delete({
			where: { id: postId },
		})

		revalidatePath("/") // purge the cache
		return { success: true }
	} catch (error) {
		console.error("Failed to delete post:", error)
		return { success: false, error: "Failed to delete post" }
	}
}

export { createPost, getPosts, toggleLike, createComment, deletePost }
