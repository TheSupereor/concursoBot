import { Subscriber } from "../entities/Subscriber";

// Dependency Inversion
export interface ISubscriberRepository {
  save(subscriber: Subscriber): Promise<void>;
  searchByTelegramId(telegramId: string): Promise<Subscriber | null>;
  searchActiveSubscribers(): Promise<Subscriber[]>;
}
// https://www.facebook.com/marketplace/item/1828712377823463/?ref=browse_tab&referral_code=marketplace_general&referral_story_type=general_listing&tracking=%7B%22qid%22%3A%22-6978096653140878077%22%2C%22mf_story_key%22%3A%225349508175603744273%22%2C%22top_level_post_id%22%3A%225349508175603744273%22%2C%22commerce_rank_obj%22%3A%22%7B%5C%22target_id%5C%22%3A5349508175603744273%2C%5C%22target_type%5C%22%3A6%2C%5C%22primary_position%5C%22%3A18%2C%5C%22ranking_signature%5C%22%3A6004338487682153247%2C%5C%22ranking_region%5C%22%3A%5C%22rva%5C%22%2C%5C%22ranking_request_id%5C%22%3A6543862011510689514%2C%5C%22commerce_channel%5C%22%3A501%2C%5C%22value%5C%22%3A0.00052390671529186%2C%5C%22upsell_type%5C%22%3A129%2C%5C%22candidate_retrieval_source_map%5C%22%3A%7B%5C%2227354068357533233%5C%22%3A3003%2C%5C%2226434822172865773%5C%22%3A805%2C%5C%2235497143113265025%5C%22%3A805%2C%5C%2226340349918954802%5C%22%3A805%2C%5C%2226198341299847584%5C%22%3A805%2C%5C%2225956632067344192%5C%22%3A805%7D%2C%5C%22grouping_info%5C%22%3Anull%7D%22%7D