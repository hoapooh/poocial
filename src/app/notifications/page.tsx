import { Metadata } from "next"
import NotificationsSection from "./_components/notifications-section"

export const metadata: Metadata = {
	title: "Notifications",
}

function NotificationsPage() {
	return <NotificationsSection />
}

export default NotificationsPage
