export type Cat = { key: string; label: string; emoji: string };

export const COMMUNITY_CATEGORIES: Cat[] = [
  { key: "education", label: "Education", emoji: "🎓" },
  { key: "college", label: "Colleges", emoji: "🏛️" },
  { key: "school", label: "Schools", emoji: "🏫" },
  { key: "technology", label: "Technology", emoji: "💻" },
  { key: "ai", label: "Artificial Intelligence", emoji: "🤖" },
  { key: "programming", label: "Programming", emoji: "⌨️" },
  { key: "jobs", label: "Jobs", emoji: "💼" },
  { key: "startups", label: "Startups", emoji: "🚀" },
  { key: "business", label: "Business", emoji: "📈" },
  { key: "finance", label: "Finance", emoji: "💰" },
  { key: "exams", label: "Government Exams", emoji: "📝" },
  { key: "gaming", label: "Gaming", emoji: "🎮" },
  { key: "photography", label: "Photography", emoji: "📷" },
  { key: "music", label: "Music", emoji: "🎵" },
  { key: "movies", label: "Movies", emoji: "🎬" },
  { key: "travel", label: "Travel", emoji: "✈️" },
  { key: "food", label: "Food", emoji: "🍜" },
  { key: "sports", label: "Sports", emoji: "🏅" },
  { key: "cricket", label: "Cricket", emoji: "🏏" },
  { key: "football", label: "Football", emoji: "⚽" },
  { key: "medicine", label: "Medicine", emoji: "🩺" },
  { key: "law", label: "Law", emoji: "⚖️" },
  { key: "agriculture", label: "Agriculture", emoji: "🌾" },
  { key: "fashion", label: "Fashion", emoji: "👗" },
  { key: "science", label: "Science", emoji: "🔬" },
  { key: "space", label: "Space", emoji: "🛰️" },
  { key: "books", label: "Books", emoji: "📚" },
  { key: "languages", label: "Languages", emoji: "🗣️" },
  { key: "local", label: "Local", emoji: "📍" },
  { key: "ngo", label: "NGOs", emoji: "🤝" },
  { key: "women", label: "Women", emoji: "🌸" },
  { key: "parents", label: "Parents", emoji: "👨‍👩‍👧" },
  { key: "developers", label: "Developers", emoji: "🛠️" },
  { key: "health", label: "Health & Fitness", emoji: "💪" },
  { key: "art", label: "Art & Design", emoji: "🎨" },
  { key: "general", label: "General", emoji: "🌐" },
];

export const catLabel = (key: string) =>
  COMMUNITY_CATEGORIES.find((c) => c.key === key)?.label ?? key;
export const catEmoji = (key: string) =>
  COMMUNITY_CATEGORIES.find((c) => c.key === key)?.emoji ?? "🌐";

export const COUNTRIES: Array<{ code: string; name: string; flag: string }> = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "TR", name: "Türkiye", flag: "🇹🇷" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
];

export const flagFor = (name?: string | null) =>
  COUNTRIES.find((c) => c.name === name)?.flag ?? "🌍";

export const STATES: Record<string, string[]> = {
  India: ["Gujarat", "Maharashtra", "Rajasthan", "Karnataka", "Tamil Nadu", "Delhi", "Uttar Pradesh", "West Bengal", "Kerala", "Punjab", "Telangana", "Madhya Pradesh", "Bihar", "Haryana", "Assam"],
  "United States": ["California", "Texas", "New York", "Florida", "Washington", "Illinois", "Massachusetts", "Georgia", "Colorado", "New Jersey"],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
  Canada: ["Ontario", "Quebec", "British Columbia", "Alberta"],
  Australia: ["New South Wales", "Victoria", "Queensland", "Western Australia"],
  Germany: ["Bavaria", "Berlin", "Hesse", "North Rhine-Westphalia"],
  Japan: ["Tokyo", "Osaka", "Kyoto", "Hokkaido"],
};

export const VERIFICATION_LABEL: Record<string, string> = {
  none: "Unverified",
  official: "Official Verified",
  government: "Government Verified",
  education: "Education Verified",
  business: "Business Verified",
  nonprofit: "Non-Profit Verified",
};

export const PRIVACY_LABEL: Record<string, string> = {
  public: "Public",
  private: "Private",
  invite: "Invite only",
};

export const POST_KINDS = [
  { key: "text", label: "Post" },
  { key: "photo", label: "Photo" },
  { key: "video", label: "Video" },
  { key: "question", label: "Question" },
  { key: "note", label: "Note" },
  { key: "article", label: "Article" },
  { key: "poll", label: "Poll" },
  { key: "event", label: "Event" },
  { key: "job", label: "Job" },
] as const;

export const FEED_FILTERS = [
  { key: "latest", label: "Latest" },
  { key: "trending", label: "Trending" },
  { key: "liked", label: "Most liked" },
  { key: "commented", label: "Most commented" },
  { key: "photo", label: "Photos" },
  { key: "video", label: "Videos" },
  { key: "question", label: "Questions" },
  { key: "note", label: "Notes" },
  { key: "article", label: "Articles" },
  { key: "poll", label: "Polls" },
  { key: "event", label: "Events" },
  { key: "job", label: "Jobs" },
] as const;

export function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}
