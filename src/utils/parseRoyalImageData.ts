export const parseRoyalImageData = (
  buffaloImage: File,
  buffaloImage2: File,
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
      title: "buffaloImage2",
      image: buffaloImage2,
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
