"use client"

import { UploadDropzone } from "@/lib/uploadthing"
import { XIcon } from "lucide-react"
import Image from "next/image"

interface ImageUploadProps {
	onChange: (url: string) => void
	value: string
	endpoint: "postImage" // INFO: this is the endpoint we defined in the server -- look at the file /api/uploadthing/core.ts line number 8
}

const ImageUpload = ({ endpoint, onChange, value }: ImageUploadProps) => {
	if (value) {
		return (
			<div className="relative size-40">
				<Image
					src={value}
					alt="Upload image"
					width={160}
					height={160}
					className="rounded-md object-contain"
				/>
				<button
					onClick={() => onChange("")}
					className="absolute top-0 right-0 p-1 bg-red-500 rounded-full shadow-sm"
					type="button"
				>
					<XIcon className="size-4 text-white" />
				</button>
			</div>
		)
	}

	return (
		<UploadDropzone
			endpoint={endpoint}
			onClientUploadComplete={(res) => {
				onChange(res?.[0].url)
			}}
			onUploadError={(error: Error) => {
				console.log(error)
			}}
		/>
	)
}

export default ImageUpload
