import {
	getProfileByUsername,
	getUserLikedPosts,
	getUserPosts,
	isFollowing,
} from "@/actions/profile.action"
import { notFound } from "next/navigation"
import ProfileSection from "./_components/profile-section"

// NOTE: Dynamic metadata generation
export async function generateMetadata({ params }: { params: { username: string } }) {
	const user = await getProfileByUsername(params.username)
	if (!user) return

	return {
		title: `${user.name ?? user.username}`,
		description: user.bio || `Check out ${user.name ?? user.username}'s posts on Poocial`,
	}
}

async function Profile({ params }: { params: { username: string } }) {
	const user = await getProfileByUsername(params.username)

	if (!user) return notFound()

	const [posts, likedPosts, isCurrentUserFollowing] = await Promise.all([
		getUserPosts(user.id),
		getUserLikedPosts(user.id),
		isFollowing(user.id),
	])

	return (
		<ProfileSection
			user={user}
			posts={posts}
			likedPosts={likedPosts}
			isCurrentUserFollowing={isCurrentUserFollowing}
		/>
	)
}

export default Profile
