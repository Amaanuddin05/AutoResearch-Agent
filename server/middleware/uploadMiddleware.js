import multer from "multer";
import { UPLOAD_DIR } from "../config/paths.js";

const upload = multer({ dest: UPLOAD_DIR });

export default upload;

