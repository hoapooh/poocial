import React from "react"

const Tasks = async () => {
	const tasks = await fetch("http://localhost:3000/api/tasks", {
		cache: "no-store",
	}).then((res) => res.json())

	console.log(tasks)

	return <div>Tasks</div>
}

export default Tasks
