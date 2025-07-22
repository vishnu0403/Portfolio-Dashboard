"use client";

import { useEffect, useState } from "react";
import { portfolioData } from "./data/portfolio";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface EnrichedStock {
  name: string;
  symbol: string;
  sector: string;
  purchasePrice: number;
  quantity: number;
  exchange: string;
  cmp: number;
  investment: number;
  presentValue: number;
  gainLoss: number;
}

export default function Home() {
  const [stocks, setStocks] = useState<EnrichedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectorFilter, setSectorFilter] = useState<string>("All");
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    fetchCMPs();
    const interval = setInterval(fetchCMPs, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchCMPs = async () => {
    const enriched: EnrichedStock[] = [];

    for (const stock of portfolioData) {
      try {
        const res = await fetch(`http://localhost:5000/api/stock/${stock.stock}`);
        const data = await res.json();

        const investment = stock.purchasePrice * stock.quantity;
        const presentValue = data.cmp * stock.quantity;
        const gainLoss = presentValue - investment;

        enriched.push({
          name: stock.name,
          symbol: stock.stock,
          sector: stock.sector,
          purchasePrice: stock.purchasePrice,
          quantity: stock.quantity,
          exchange: stock.exchange,
          cmp: data.cmp,
          investment,
          presentValue,
          gainLoss,
        });
      } catch (error) {
        console.error("Fetch failed", error);
      }
    }

    setStocks(enriched);
    setLoading(false);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(stocks);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Portfolio");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "portfolio.xlsx");
  };

  const filteredStocks = sectorFilter === "All"
    ? stocks
    : stocks.filter((s) => s.sector === sectorFilter);

  const totalInvestment = filteredStocks.reduce((sum, s) => sum + s.investment, 0);

  const sectorGroups = filteredStocks.reduce((groups, stock) => {
    const { sector } = stock;
    if (!groups[sector]) {
      groups[sector] = {
        investment: 0,
        presentValue: 0,
        gainLoss: 0,
      };
    }
    groups[sector].investment += stock.investment;
    groups[sector].presentValue += stock.presentValue;
    groups[sector].gainLoss += stock.gainLoss;
    return groups;
  }, {} as Record<string, { investment: number; presentValue: number; gainLoss: number }>);

  const sectors = Array.from(new Set(stocks.map((s) => s.sector)));

  return (
    <main className={`p-6 sm:p-10 min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-black"}`}>
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-center">
          📈 My Portfolio Dashboard
        </h1>
        <div className="flex gap-4 mt-4 sm:mt-0">
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="border rounded px-3 py-1 text-black"
          >
            <option value="All">All Sectors</option>
            {sectors.map((sector) => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>
          <button onClick={handleExport} className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded shadow">
            Export Excel
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="bg-gray-800 text-white font-bold py-1 px-3 rounded shadow">
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center">Loading portfolio...</p>
      ) : (
        <>
          {/* Sector Summary */}
          {Object.entries(sectorGroups).map(([sector, data]) => (
            <div
              key={sector}
              className="mb-6 bg-blue-100/30 dark:bg-blue-900/30 backdrop-blur-sm rounded-lg p-4 shadow hover:shadow-xl transition duration-300"
            >
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                📊 {sector} Sector
              </h2>
              <div className="text-sm space-y-1">
                <div><span className="font-semibold">Investment:</span> ₹{data.investment.toFixed(2)}</div>
                <div><span className="font-semibold">Present Value:</span> ₹{data.presentValue.toFixed(2)}</div>
                <div className={`font-semibold ${data.gainLoss >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {data.gainLoss >= 0 ? "▲" : "▼"} ₹{data.gainLoss.toFixed(2)}
                </div>
              </div>
            </div>
          ))}

          {/* Portfolio Table */}
          <div className="overflow-x-auto bg-blue-100/30 dark:bg-blue-900/30 backdrop-blur-sm shadow-lg rounded-lg p-4 animate-fade-in">
            <table className="min-w-full table-auto text-sm border border-gray-200">
              <thead className="bg-gray-200 dark:bg-gray-700">
                <tr>
                  {["Stock", "Sector", "Exchange", "Qty", "Purchase", "Investment", "CMP", "Present", "Gain/Loss", "%"].map(h => (
                    <th key={h} className="p-2 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((s) => (
                  <tr
                    key={s.symbol}
                    className="border-t border-gray-200 hover:bg-blue-200/30 dark:hover:bg-blue-800/30 backdrop-blur-sm transition duration-200"
                  >
                    <td className="p-2 font-medium">{s.name}</td>
                    <td className="p-2">{s.sector}</td>
                    <td className="p-2">{s.exchange}</td>
                    <td className="p-2">{s.quantity}</td>
                    <td className="p-2">₹{s.purchasePrice.toFixed(2)}</td>
                    <td className="p-2">₹{s.investment.toFixed(2)}</td>
                    <td className="p-2 text-blue-500">₹{s.cmp.toFixed(2)}</td>
                    <td className="p-2">₹{s.presentValue.toFixed(2)}</td>
                    <td className={`p-2 font-semibold ${s.gainLoss >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {s.gainLoss >= 0 ? "▲" : "▼"} ₹{s.gainLoss.toFixed(2)}
                    </td>
                    <td className="p-2">{((s.investment / totalInvestment) * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
