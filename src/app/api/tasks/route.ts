interface Task {
	id: number
	title: string
	completed: boolean
}

interface CreateTaskRequest {
	title: string
}

const tasks: Task[] = [
	{
		id: 1,
		title: "Task 1",
		completed: false,
	},
	{
		id: 2,
		title: "Task 2",
		completed: true,
	},
]

export async function GET() {
	return Response.json(tasks, { status: 200 })
}

export async function POST(request: Request) {
	try {
		const body: CreateTaskRequest = await request.json()

		if (!body.title) {
			return Response.json({ error: "Title is required" }, { status: 400 })
		}

		const newTask: Task = {
			id: tasks.length + 1,
			title: body.title,
			completed: false,
		}

		tasks.push(newTask)
		return Response.json(newTask, { status: 201 })
	} catch (error) {
		console.error(error)

		return Response.json({ error: "Invalid request body" }, { status: 400 })
	}
}
