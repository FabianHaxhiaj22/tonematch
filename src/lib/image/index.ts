/** Photo input checks (D-035): format sniffing and limits, before any decoding. */
export * from "./config";
export {
  checkPhotoFile,
  looksLikeHeif,
  sniffImageFormat,
  type AcceptedFormat,
  type PhotoCheck,
  type PhotoMeta,
  type PhotoRejection,
  type SniffedFormat,
} from "./fileType";
