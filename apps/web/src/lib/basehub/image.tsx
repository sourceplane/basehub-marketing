import Image from "next/image";
import { BaseHubImage as ConnectedImage, type BaseHubImageProps } from "basehub/next-image";

/**
 * `<BaseHubImage>`: BaseHub's image (its loader resizes through BaseHub's
 * asset CDN) for a BaseHub asset, and a plain unoptimized image for the
 * sample content's own files under /sample, which that CDN has never seen.
 */
export function BaseHubImage(props: BaseHubImageProps) {
  if (typeof props.src === "string" && props.src.startsWith("/")) {
    // BaseHub's `placeholder` takes its own thumbhash data; a sample image is
    // a small local SVG and needs none.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { alt, placeholder, ...rest } = props;
    return <Image alt={alt} {...rest} unoptimized />;
  }
  return <ConnectedImage {...props} />;
}
