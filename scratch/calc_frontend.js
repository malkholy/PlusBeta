const consumption = [
    { "TotalQuantity": 12400 },
    { "TotalQuantity": 740100 },
    { "TotalQuantity": 6005 },
    { "TotalQuantity": 66178.69423 },
    { "TotalQuantity": 699045 },
    { "TotalQuantity": 4919.04095 },
    { "TotalQuantity": 56440.48186 },
    { "TotalQuantity": 330835 },
    { "TotalQuantity": 4963.45905 },
    { "TotalQuantity": 45978.7992 },
    { "TotalQuantity": 196350 },
    { "TotalQuantity": 1997.43707 },
    { "TotalQuantity": 43196 },
    { "TotalQuantity": 439256 },
    { "TotalQuantity": 15934.39207 },
    { "TotalQuantity": 52779.33956 },
    { "TotalQuantity": 610600 },
    { "TotalQuantity": 1542.96251 },
    { "TotalQuantity": 85473.166 },
    { "TotalQuantity": 26250 },
    { "TotalQuantity": 6221.42186 },
    { "TotalQuantity": 67751 },
    { "TotalQuantity": 392850 },
    { "TotalQuantity": 4614.19198 },
    { "TotalQuantity": 58842.25196 },
    { "TotalQuantity": 557600 },
    { "TotalQuantity": 9600.16588 },
    { "TotalQuantity": 80221.55038 },
    { "TotalQuantity": 569330 },
    { "TotalQuantity": 10015.02876 },
    { "TotalQuantity": 85853.25416 },
    { "TotalQuantity": 1517560 },
    { "TotalQuantity": 4600.54893 },
    { "TotalQuantity": 81844.29344 },
    { "TotalQuantity": 1685200 },
    { "TotalQuantity": 1451.19 },
    { "TotalQuantity": 92436.61072 }
];

const total12Months = consumption.reduce((sum, c) => sum + Number(c.TotalQuantity || 0), 0);
const monthlyAverage = consumption.length > 0 ? (total12Months / consumption.length) : 0;
const values = consumption.map(c => Number(c.TotalQuantity || 0));
let variance = 0;
if (values.length > 1) {
  const sqDiffs = values.map(v => Math.pow(v - monthlyAverage, 2));
  variance = sqDiffs.reduce((sum, d) => sum + d, 0) / (values.length - 1);
}
const stdDev = Math.sqrt(variance);
const dailyAvg = Math.ceil(monthlyAverage / 26);

const defaultLT = Math.ceil((18 + 15 + 14) / 3); // 16
const recentThree = [18, 15, 14];
let computedLeadTimeStdDev = 0;
if (recentThree.length > 1) {
  const ltMean = recentThree.reduce((sum, l) => sum + l, 0) / recentThree.length;
  const ltSqDiffs = recentThree.map(l => Math.pow(l - ltMean, 2));
  computedLeadTimeStdDev = Math.sqrt(ltSqDiffs.reduce((sum, d) => sum + d, 0) / (recentThree.length - 1));
}

const activeLeadTime = defaultLT;
const dailyDemandStdDev = stdDev / 26;
const combinedStdDev = Math.sqrt(
  activeLeadTime * Math.pow(dailyDemandStdDev, 2) +
  Math.pow(dailyAvg, 2) * Math.pow(computedLeadTimeStdDev, 2)
);

const serviceLevelFactor = 1.65; // Assuming 95%
const calculatedSafetyStock = activeLeadTime > 0 ? Math.ceil(combinedStdDev * serviceLevelFactor) : 0;
console.log("Calculated Safety Stock:", calculatedSafetyStock);
console.log("Daily Avg:", dailyAvg);
console.log("StdDev:", stdDev);
console.log("LT StdDev:", computedLeadTimeStdDev);
console.log("Combined StdDev:", combinedStdDev);
