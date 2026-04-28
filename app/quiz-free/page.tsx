import { redirect } from "next/navigation";

export default function QuizFreePage() {
  redirect("/dashboard/quiz?audience=free");
}
