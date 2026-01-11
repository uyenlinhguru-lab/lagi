
export enum CategoryType {
  VIDEO = 'VIDEO',
  ARTICLE = 'ARTICLE',
  SONG = 'SONG'
}

export interface GeneralScores {
  topic: number;      // max 10
  mention: number;    // max 10
  emotion: number;    // max 15
  message: number;    // max 15
  compliance: number; // max 10
}

export interface SpecificScores {
  criteria1: number; // max 8
  criteria2: number; // max 6
  criteria3: number; // max 6
}

export interface SocialScores {
  likeCount: number;
  shareCount: number;
  commentCount: number;
  likePoints: number;    // max 5
  sharePoints: number;   // max 7
  commentPoints: number; // max 8
}

export interface Contestant {
  id: string;
  name: string;
  entryCode: string;
  category: CategoryType;
  general: GeneralScores;
  specific: SpecificScores;
  social: SocialScores;
  totalScore: number;
  timestamp: number;
  aiFeedback?: string;
}

export const CATEGORY_LABELS: Record<CategoryType, string> = {
  [CategoryType.VIDEO]: 'Thể loại Video',
  [CategoryType.ARTICLE]: 'Thể loại Bài viết',
  [CategoryType.SONG]: 'Thể loại Bài hát'
};
