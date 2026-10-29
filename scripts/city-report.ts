import { formatCityReport } from "../lib/city-report";
import { getHubIndex } from "../lib/hubs";

console.log(formatCityReport(getHubIndex().cities));
