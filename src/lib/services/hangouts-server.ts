import {
  mapHangout,
  type HangoutRowJson,
} from "@/lib/supabase/mappers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Hangout } from "@/types/hangout";

export async function fetchHangoutBySlugServer(
  slug: string,
): Promise<{ data?: Hangout; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.rpc("get_hangout_public", {
      p_slug: slug,
    });

    if (error) {
      return { error: error.message ?? "Could not load hangout" };
    }

    if (!data) {
      return { error: "Hangout not found" };
    }

    return { data: mapHangout(data as HangoutRowJson) };
  } catch {
    return { error: "Could not load hangout" };
  }
}
