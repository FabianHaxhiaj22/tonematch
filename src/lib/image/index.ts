/** Photo input checks (D-035): format sniffing and limits, before any decoding; analysis size. */
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
export { fitLongSide, type FittedSize } from "./resize";
