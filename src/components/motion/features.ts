/**
 * Motion's animation features, loaded lazily by <MotionRoot> (a separate chunk, fetched after the
 * page is interactive) so pages don't pay for animation code up front.
 */
import { domAnimation } from "motion/react";

export default domAnimation;
