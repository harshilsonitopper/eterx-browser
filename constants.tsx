import { NewsItem, Shortcut } from './types';

export const INITIAL_NEWS: NewsItem[] = [
  {
    id: '1',
    title: "OpenAI CEO declares 'code red' as Google gains ground",
    source: "15 minutes ago",
    time: "TechCrunch",
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800",
    category: "Technology"
  },
  {
    id: '2',
    title: "The james webb telescope discovers a new planet",
    source: "1 hour ago",
    time: "SpaceNews",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800",
    category: "Space"
  }
];

export const SHORTCUTS: Shortcut[] = [
  { name: 'Netflix', url: 'https://netflix.com', icon: 'N' },
  { name: 'NBA', url: 'https://nba.com', icon: '🏀' },
  { name: 'NFL', url: 'https://nfl.com', icon: '🏈' },
  { name: 'Nordstrom', url: 'https://nordstrom.com', icon: '🛍️' },
  { name: 'NBA Scores', url: 'https://nba.com/scores', icon: '📊' },
];

export const SUGGESTIONS = [
  "Summarize this page",
  "Compare iPhone 16 vs Pixel 9",
  "Find cheap flights to Tokyo",
  "Write a polite email decline"
];