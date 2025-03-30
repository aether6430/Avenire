import { generateReactHelpers } from "@avenire/storage/client"
import { Router } from "./upload"

export const { useUploadThing, uploadFiles } = generateReactHelpers<Router>();
