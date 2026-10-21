import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <a href="https://irl.group" aria-label="IRL — In Real Life" className="mb-5 flex justify-center">
            <img
              src={`${import.meta.env.BASE_URL}images/irl-monogram.png`}
              alt="IRL — In Real Life"
              width={72}
              height={72}
              className="h-[72px] w-[72px] rounded-xl object-contain"
            />
          </a>
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
