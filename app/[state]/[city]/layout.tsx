import { getCityByParams } from "@/app/lib/cityData";
import CityTabNav from "@/app/components/CityTabNav";

/**
 * Shared layout for every /[state]/[city]/* page (city index, topics list,
 * topic detail). Surfaces the per-city tab nav (Meetings / Topics) so
 * Topics is discoverable from anywhere under a selected city, not just a
 * small link buried on the city index page.
 *
 * getCityByParams is React-cache()'d, so calling it here in addition to
 * each page component doesn't cost an extra DB round-trip per request.
 */
export default async function CityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ state: string; city: string }>;
}) {
  const { state, city: citySlug } = await params;
  const cityData = await getCityByParams(state, citySlug);

  return (
    <>
      {cityData && (
        <CityTabNav state={state} citySlug={citySlug} cityName={cityData.name} />
      )}
      {children}
    </>
  );
}
