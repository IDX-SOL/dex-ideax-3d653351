import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { updateSymbol } from "@/utils/storage";

/** Legacy /perp/:symbol route — persist symbol and redirect to clean root URL. */
export default function PerpSymbol() {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (params.symbol) {
      updateSymbol(params.symbol);
    }

    const searchParamsString = searchParams.toString();
    const redirectPath = searchParamsString ? `/?${searchParamsString}` : "/";
    navigate(redirectPath, { replace: true });
  }, [navigate, params.symbol, searchParams]);

  return null;
}
