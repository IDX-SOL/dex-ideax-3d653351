import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

/** Legacy /perp route — redirect to /futures. */
export default function PerpIndex() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const searchParamsString = searchParams.toString();
    const redirectPath = searchParamsString
      ? `/futures?${searchParamsString}`
      : "/futures";
    navigate(redirectPath, { replace: true });
  }, [navigate, searchParams]);

  return null;
}
