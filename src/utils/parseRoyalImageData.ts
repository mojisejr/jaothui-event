export const parseRoyalImageData = (
  buffaloImage: File,
  frontImage: File,
  sideImage: File,
  backImage: File,
  d1Image: File,
  d2Image: File,
  d3Image: File,
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
    {
      title: "d1Image",
      image: d1Image,
    },
    {
      title: "d2Image",
      image: d2Image,
    },
    {
      title: "d3Image",
      image: d3Image,
    },
  ];
};
