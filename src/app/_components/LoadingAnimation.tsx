import Image from "next/image";

export function LoadingAnimation() {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <Image
        src="/Y_Combinator_logo.svg"
        alt="Y Combinator Logo"
        width={256}
        height={256}
        className="border-2 border-white animate-spin"
      />
    </div>
  );
}
