import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

/** Legacy /perp route — redirect to clean root URL. */
export default function PerpIndex() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const searchParamsString = searchParams.toString();
    const redirectPath = searchParamsString ? `/?${searchParamsString}` : "/";
    navigate(redirectPath, { replace: true });
  }, [navigate, searchParams]);

  return null;
}
