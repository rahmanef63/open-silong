import type { TemplateJson } from "../lib/validate";

/** Recipe Vault — recipe library + meal plan.
 *
 *  Single root page with columns3 quick-filter strip + columns2
 *  pairing the gallery view with the meal-plan calendar. Two
 *  databases linked: recipes ←→ meal plan. */
export const recipeVault: TemplateJson = {
  version: 1,
  name: "Recipe Vault",
  icon: "🍳",
  category: "Lifestyle",
  description: "Recipe library w/ gallery + meal-plan calendar + nutrition KPIs.",
  page: {
    ref: "root",
    title: "Recipe Vault",
    icon: "🍳",
    blocks: [
      { type: "h1", text: "🍳 Recipe Vault" },
      { type: "callout", text: "Recipes on the left, this week's meal plan on the right. Open the recipes database → switch to Gallery for visual browsing." },

      { type: "h2", text: "🍱 Quick filter" },
      {
        type: "columns3",
        columns: [
          [
            { type: "h3", text: "🥗 Light" },
            { type: "paragraph", text: "Filter recipes by Cuisine = Salad / Bowl. < 500 cal." },
          ],
          [
            { type: "h3", text: "🍝 Comfort" },
            { type: "paragraph", text: "Filter Cuisine = Italian / American." },
          ],
          [
            { type: "h3", text: "🍣 Adventurous" },
            { type: "paragraph", text: "Filter Cuisine = Japanese / Thai / Other." },
          ],
        ],
      },

      {
        type: "columns2",
        columns: [
          [
            { type: "h3", text: "📚 Recipes" },
            { type: "database", databaseRef: "recipes" },
          ],
          [
            { type: "h3", text: "📅 Meal plan" },
            { type: "database", databaseRef: "mealPlan" },
          ],
        ],
      },

      { type: "h2", text: "🛒 Shopping list" },
      {
        type: "columns2",
        columns: [
          [
            { type: "h3", text: "Produce" },
            { type: "todo", text: "Spinach", checked: false },
            { type: "todo", text: "Tomatoes", checked: false },
            { type: "todo", text: "Garlic", checked: false },
          ],
          [
            { type: "h3", text: "Pantry" },
            { type: "todo", text: "Olive oil", checked: false },
            { type: "todo", text: "Pasta", checked: false },
            { type: "todo", text: "Soy sauce", checked: false },
          ],
        ],
      },
    ],
    databases: [
      {
        ref: "recipes",
        name: "Recipes",
        icon: "📚",
        properties: [
          { id: "name", name: "Recipe", type: "text" },
          {
            id: "cuisine",
            name: "Cuisine",
            type: "select",
            options: [
              { id: "italian", name: "Italian", color: "red" },
              { id: "japanese", name: "Japanese", color: "purple" },
              { id: "thai", name: "Thai", color: "yellow" },
              { id: "american", name: "American", color: "blue" },
              { id: "salad", name: "Salad", color: "green" },
              { id: "bowl", name: "Bowl", color: "orange" },
              { id: "other", name: "Other", color: "gray" },
            ],
          },
          {
            id: "diet",
            name: "Diet",
            type: "multi_select",
            options: [
              { id: "vegetarian", name: "Vegetarian", color: "green" },
              { id: "vegan", name: "Vegan", color: "green" },
              { id: "glutenfree", name: "Gluten-free", color: "orange" },
              { id: "highprotein", name: "High protein", color: "red" },
            ],
          },
          { id: "calories", name: "Calories", type: "number" },
          { id: "protein", name: "Protein (g)", type: "number" },
          { id: "prepMins", name: "Prep (min)", type: "number" },
          { id: "rating", name: "Rating", type: "number", numberFormat: "decimal", numberDecimals: 1 },
          { id: "url", name: "Source", type: "url" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "gallery", name: "Gallery", payload: { gallerySize: "medium", galleryAspect: "video" } },
          { id: "v3", type: "board", name: "By cuisine", groupBy: "cuisine" },
          {
            id: "v4", type: "chart", name: "Calories by cuisine",
            payload: { chartKind: "bar", chartXProp: "cuisine", chartYProp: "calories", chartAggregate: "avg" },
          },
          {
            id: "v5", type: "dashboard", name: "Nutrition",
            payload: { dashboardKPIs: ["calories", "protein"], dashboardBreakdowns: ["cuisine", "diet"], dashboardRecentLimit: 5 },
          },
        ],
        seedRows: [
          { props: { name: "Carbonara", cuisine: "italian", diet: ["highprotein"], calories: 720, protein: 28, prepMins: 25, rating: 4.7 } },
          { props: { name: "Buddha bowl", cuisine: "bowl", diet: ["vegetarian", "glutenfree"], calories: 480, protein: 22, prepMins: 20, rating: 4.5 } },
          { props: { name: "Pad Thai", cuisine: "thai", diet: ["highprotein"], calories: 650, protein: 30, prepMins: 30, rating: 4.6 } },
          { props: { name: "Caesar salad", cuisine: "salad", diet: ["vegetarian"], calories: 380, protein: 14, prepMins: 10, rating: 4.2 } },
          { props: { name: "Salmon teriyaki", cuisine: "japanese", diet: ["highprotein", "glutenfree"], calories: 540, protein: 38, prepMins: 25, rating: 4.8 } },
        ],
      },
      {
        ref: "mealPlan",
        name: "Meal plan",
        icon: "📅",
        properties: [
          { id: "name", name: "Meal", type: "text" },
          { id: "recipe", name: "Recipe", type: "relation", relationDatabaseRef: "recipes" },
          { id: "day", name: "Day", type: "date" },
          {
            id: "slot",
            name: "Slot",
            type: "select",
            options: [
              { id: "breakfast", name: "Breakfast", color: "yellow" },
              { id: "lunch", name: "Lunch", color: "blue" },
              { id: "dinner", name: "Dinner", color: "purple" },
              { id: "snack", name: "Snack", color: "gray" },
            ],
          },
          { id: "servings", name: "Servings", type: "number" },
        ],
        views: [
          { id: "v1", type: "table", name: "Week list", isDefault: true },
          {
            id: "v2", type: "calendar", name: "Calendar",
            payload: { calendarDateProp: "day", calendarMode: "week", calendarColorByProp: "slot" },
          },
          { id: "v3", type: "board", name: "By slot", groupBy: "slot" },
        ],
        seedRows: [
          { props: { name: "Mon dinner", day: "2026-05-11", slot: "dinner", servings: 2 } },
          { props: { name: "Tue lunch", day: "2026-05-12", slot: "lunch", servings: 1 } },
          { props: { name: "Wed dinner", day: "2026-05-13", slot: "dinner", servings: 2 } },
        ],
      },
    ],
  },
};
