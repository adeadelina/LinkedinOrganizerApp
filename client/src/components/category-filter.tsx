import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  category: string;
  className?: string;
}

export function CategoryFilter({ category, className }: CategoryFilterProps) {
  // Define category styles based on the category name
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "PLG Strategy":
        return "bg-blue-100 text-blue-800";
      case "Pricing experiments":
        return "bg-purple-100 text-purple-800";
      case "Onboarding":
        return "bg-orange-100 text-orange-800";
      case "Stakeholder management":
        return "bg-pink-100 text-pink-800";
      case "AI tools for PM":
        return "bg-indigo-100 text-indigo-800";
      case "Communication":
        return "bg-green-100 text-green-800";
      case "Coaching":
        return "bg-yellow-100 text-yellow-800";
      case "Free trial":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
      getCategoryStyles(category),
      className
    )}>
      {category}
    </span>
  );
}
