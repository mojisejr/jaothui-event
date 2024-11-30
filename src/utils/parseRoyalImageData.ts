export const parseRoyalImageData = (
  buffaloImage: File,
  frontImage: File,
  sideImage: File,
  backImage: File,
) => {
  return [
    {
      title: "buffaloImage",
      image: buffaloImage,
    },
    {
      title: "frontImage",
      image: frontImage,
    },
    {
      title: "sideImage",
      image: sideImage,
    },
    {
      title: "backImage",
      image: backImage,
    },
  ];
};
