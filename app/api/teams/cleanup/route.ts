import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  try {
    const result = await convex.query(api.teams.getTeamsWithoutCities);
    
    return Response.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error fetching teams without cities:", error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const result = await convex.mutation(api.teams.removeTeamsWithoutCities);
    
    return Response.json({
      success: true,
      message: `Removed ${result.removedCount} teams without cities`,
      data: result
    });
  } catch (error) {
    console.error("Error removing teams without cities:", error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 