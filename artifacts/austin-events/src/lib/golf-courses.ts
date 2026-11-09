const golfImage = (fileName: string) => `${import.meta.env.BASE_URL}images/golf/${fileName}`;

export const GOLF_COURSES = [
  {
    name: "Roy Kizer Course",
    href: "https://www.austintexas.gov/golfatx/roy-kizer-course",
    imageSrc: golfImage("roy-kizer.png"),
    imageAlt: "Fairway beside a lake at Roy Kizer Course.",
  },
  {
    name: "Morris Williams Course",
    href: "https://www.austintexas.gov/golfatx/morris-williams-course",
    imageSrc: golfImage("morris-williams.png"),
    imageAlt: "Fairway, water, and oak tree at Morris Williams Course.",
  },
  {
    name: "Jimmy Clay Course",
    href: "https://www.austintexas.gov/golfatx/jimmy-clay-course",
    imageSrc: golfImage("jimmy-clay.png"),
    imageAlt: "Aerial view of water, fairway, and cart path at Jimmy Clay Course.",
  },
  {
    name: "Forest Creek Golf Club",
    href: "https://forestcreekgolfclub.com/golf/south-course/",
    imageSrc: golfImage("forest-creek.png"),
    imageAlt: "Golf green, bunkers, and pond at Forest Creek Golf Club.",
  },
] as const;
