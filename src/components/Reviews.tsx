import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Lang = "es" | "en";

type Review = {
  id: string;
  name: string;
  role: string | null;
  rating: number;
  comment: string;
  type: "client" | "barber";
  is_active: boolean;
};

export default function Reviews({ lang = "es" }: { lang?: Lang }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadReviews() {
      const { data, error } = await supabase
        .from("reviews")
        .select("id,name,role,rating,comment,type,is_active,created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      setReviews((data || []) as Review[]);
      setLoading(false);
    }

    loadReviews();
  }, []);

  const title = lang === "es" ? "Reseñas" : "Reviews";
  const subtitle =
    lang === "es"
      ? "Lo que nuestros clientes dicen de nosotros"
      : "What our clients say about us";

  return (
    <section id="reviews" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-brand-blue">{title}</h2>
          <p className="mt-4 text-gray-500">{subtitle}</p>
        </div>

        {loading && (
          <p className="text-center text-gray-500">
            {lang === "es" ? "Cargando reseñas..." : "Loading reviews..."}
          </p>
        )}

        {!loading && errorMsg && (
          <p className="text-center text-red-500">
            Error Supabase: {errorMsg}
          </p>
        )}

        {!loading && !errorMsg && reviews.length === 0 && (
          <p className="text-center text-gray-500">
            {lang === "es"
              ? "Todavía no hay reseñas activas."
              : "No active reviews yet."}
          </p>
        )}

        {!loading && reviews.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-3xl border bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-black">{review.name}</h3>
                    <p className="text-sm capitalize text-gray-500">
                      {review.role || review.type}
                    </p>
                  </div>

                  <div className="text-yellow-500">
                    {"★".repeat(Number(review.rating) || 5)}
                  </div>
                </div>

                <p className="text-gray-700">“{review.comment}”</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}