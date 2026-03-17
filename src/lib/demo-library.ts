import type { LibrarySummary, PhotoRecord } from "@/lib/types";

const makePhotoSvg = (title: string, colorA: string, colorB: string, accent: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${colorA}" />
          <stop offset="100%" stop-color="${colorB}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#bg)" rx="48" />
      <circle cx="1040" cy="160" r="88" fill="${accent}" opacity="0.78" />
      <path d="M0 730 C170 640, 300 650, 470 720 S840 840, 1200 650 L1200 900 L0 900 Z" fill="rgba(255,255,255,0.18)" />
      <path d="M0 610 C160 490, 300 520, 420 590 S870 720, 1200 520 L1200 900 L0 900 Z" fill="rgba(11, 19, 43, 0.2)" />
      <rect x="72" y="72" width="1056" height="756" rx="42" fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="4" />
      <text x="84" y="796" fill="white" font-size="58" font-family="Verdana, sans-serif" font-weight="700">${title}</text>
    </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const demoLibrary: PhotoRecord[] = [
  {
    id: "yosemite-cabin-2024",
    title: "Yosemite Cabin Morning",
    imageUrl: "/demo-images/sunrise-holua-cabin.jpg",
    caption: "Jake wrapped in a blanket outside the Yosemite cabin at sunrise.",
    story: "The first quiet morning of our Yosemite trip last June, with pine trees, mugs of coffee, and fog lifting off the valley.",
    labels: ["trip", "mountains", "family", "sunrise", "cabin"],
    people: ["Jake", "Mom"],
    year: 2024,
    month: 6,
    location: "Yosemite",
    emotion: "calm",
    color: "#3b6978",
  },
  {
    id: "jake-soccer-2023",
    title: "Jake Soccer Breakaway",
    imageUrl: "/demo-images/children-playing-soccer.jpg",
    caption: "Jake sprinting down the field in his blue jersey during a Saturday match.",
    story: "A loud, windy league game where Jake scored and the whole family yelled from the sidelines.",
    labels: ["soccer", "sports", "outdoor", "family", "weekend"],
    people: ["Jake", "Dad"],
    year: 2023,
    month: 9,
    location: "San Jose",
    emotion: "excited",
    color: "#2b9348",
  },
  {
    id: "grandma-birthday-2023",
    title: "Grandma Birthday Tears",
    imageUrl: makePhotoSvg("Grandma Birthday Tears", "#6d597a", "#b56576", "#ffb4a2"),
    caption: "Grandma wiping happy tears as the birthday cake comes out.",
    story: "The birthday where Grandma cried when the kids started singing and everyone crowded into the kitchen.",
    labels: ["birthday", "family", "cake", "indoor", "celebration"],
    people: ["Grandma", "Jake", "Mia", "Mom"],
    year: 2023,
    month: 11,
    location: "Fremont",
    emotion: "joyful",
    color: "#b56576",
  },
  {
    id: "hawaii-beach-2023",
    title: "Hawaii Beach Sunset",
    imageUrl: "/demo-images/family-beach-sunset.jpg",
    caption: "The whole family walking barefoot toward the water in Maui.",
    story: "Golden beach light, little waves, and a lot of sandy feet during our Hawaii trip in 2023.",
    labels: ["beach", "trip", "sunset", "family", "ocean"],
    people: ["Jake", "Mia", "Mom", "Dad"],
    year: 2023,
    month: 7,
    location: "Maui",
    emotion: "happy",
    color: "#134074",
  },
  {
    id: "santa-cruz-boardwalk-2023",
    title: "Santa Cruz Boardwalk",
    imageUrl: makePhotoSvg("Santa Cruz Boardwalk", "#3d5a80", "#98c1d9", "#ee6c4d"),
    caption: "Mia and Jake holding fries with the rides glowing behind them.",
    story: "A one-day beach trip to Santa Cruz with arcade games, fries, and a windy walk near the boardwalk.",
    labels: ["beach", "boardwalk", "trip", "kids", "rides"],
    people: ["Jake", "Mia"],
    year: 2023,
    month: 8,
    location: "Santa Cruz",
    emotion: "playful",
    color: "#98c1d9",
  },
  {
    id: "lake-fish-2024",
    title: "Jake Caught the Fish",
    imageUrl: makePhotoSvg("Jake Caught the Fish", "#003049", "#1d3557", "#f77f00"),
    caption: "Jake holding a fish beside the lake while Grandpa laughs.",
    story: "The trip where Jake caught the fish and Grandpa insisted on taking three victory photos.",
    labels: ["lake", "fishing", "trip", "family", "outdoor"],
    people: ["Jake", "Grandpa"],
    year: 2024,
    month: 5,
    location: "Lake Tahoe",
    emotion: "proud",
    color: "#1d3557",
  },
  {
    id: "road-trip-nevada-2022",
    title: "Desert Road Trip",
    imageUrl: makePhotoSvg("Desert Road Trip", "#6c584c", "#a98467", "#ffcb77"),
    caption: "The car parked at a dusty overlook with mountains in the distance.",
    story: "The long summer road trip with snack stops, playlists, and a lot of highway photos.",
    labels: ["road trip", "travel", "desert", "car", "summer"],
    people: ["Mom", "Dad", "Jake", "Mia"],
    year: 2022,
    month: 8,
    location: "Nevada",
    emotion: "nostalgic",
    color: "#a98467",
  },
  {
    id: "holiday-cookie-2024",
    title: "Holiday Cookie Chaos",
    imageUrl: makePhotoSvg("Holiday Cookie Chaos", "#8d0801", "#bf0603", "#ffba08"),
    caption: "Flour everywhere while the cousins decorate cookies around the island.",
    story: "A loud holiday baking afternoon with cousins, frosting, and Grandma directing everyone from the corner chair.",
    labels: ["holiday", "family", "kitchen", "cookies", "indoor"],
    people: ["Grandma", "Jake", "Mia"],
    year: 2024,
    month: 12,
    location: "San Ramon",
    emotion: "chaotic",
    color: "#bf0603",
  },
  {
    id: "happy-park-picnic-2023",
    title: "Picnic Laughing Fit",
    imageUrl: makePhotoSvg("Picnic Laughing Fit", "#386641", "#6a994e", "#f2e8cf"),
    caption: "Everyone laughing mid-story during a blanket picnic in the park.",
    story: "One of those photos where literally everyone looks happy and someone is halfway through telling a terrible joke.",
    labels: ["picnic", "family", "park", "happy", "outdoor"],
    people: ["Jake", "Mia", "Mom", "Dad", "Grandma"],
    year: 2023,
    month: 4,
    location: "Cupertino",
    emotion: "happy",
    color: "#6a994e",
  },
  {
    id: "on-this-day-2025",
    title: "School Talent Night",
    imageUrl: makePhotoSvg("School Talent Night", "#14213d", "#274c77", "#e5e5e5"),
    caption: "Mia on stage while the rest of the family films from the front row.",
    story: "The family photo from school talent night that would make a great on-this-day memory card next year.",
    labels: ["school", "stage", "family", "night", "performance"],
    people: ["Mia", "Mom", "Dad"],
    year: 2025,
    month: 3,
    location: "Sunnyvale",
    emotion: "proud",
    color: "#274c77",
  },
];

export const demoLibrarySummary: LibrarySummary = {
  photoCount: demoLibrary.length,
  tagChips: ["Beach", "Family", "Trips", "Soccer", "Birthdays", "Holidays"],
  prompts: [
    "Show our Yosemite trip last June",
    "Find photos of Jake playing soccer",
    "Show photos where everyone looks happy",
  ],
  highlights: ["Seeded demo library", "Uploads up to 25 images", "Voice input supported"],
};

export const goldenQueries = [
  {
    query: "Show me photos from our Yosemite trip last June",
    expectedTopId: "yosemite-cabin-2024",
  },
  {
    query: "Find pictures of Jake playing soccer",
    expectedTopId: "jake-soccer-2023",
  },
  {
    query: "Show the birthday where Grandma cried",
    expectedTopId: "grandma-birthday-2023",
  },
  {
    query: "Show photos where everyone looks happy",
    expectedTopId: "happy-park-picnic-2023",
  },
];
