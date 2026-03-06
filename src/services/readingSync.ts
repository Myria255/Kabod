import {
  enqueuePendingProgress,
  flushPendingProgress,
  upsertLocalCompletedDay,
} from "@/src/stockage/readingProgress";
import { supabase } from "@/supabaseClient";

const TABLE_PROGRESSION_LECTURE = "progression_lecture";

export async function markDayAsCompleted(
  userId: string,
  planType: string,
  day: number
) {
  await upsertLocalCompletedDay(userId, planType, day);
  await flushPendingProgress(userId, planType);

  const completedAt = new Date().toISOString();
  const result = await supabase
    .from(TABLE_PROGRESSION_LECTURE)
    .upsert(
      {
        utilisateur_id: userId,
        plan: planType,
        numero: day,
        valide: true,
        date_validation: completedAt,
      },
      { onConflict: "utilisateur_id,plan,numero" }
    );

  if (result.error) {
    await enqueuePendingProgress(userId, planType, day, completedAt);
  }

  return result;
}
