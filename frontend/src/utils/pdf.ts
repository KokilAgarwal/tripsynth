import jsPDF from 'jspdf';
import type { Itinerary } from '../types';
import { formatCurrency, timeSlotLabel } from './api';

export function downloadItineraryPdf(itinerary: Itinerary, tripName: string): void {
  const doc = new jsPDF();
  const margin = 20;
  let y = margin;

  doc.setFontSize(20);
  doc.text('TripSynth Itinerary', margin, y);
  y += 10;

  doc.setFontSize(14);
  doc.text(tripName, margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(`${itinerary.destination} · ${itinerary.date_range}`, margin, y);
  y += 6;
  doc.text(
    `${itinerary.num_days} days · Budget: ${formatCurrency(itinerary.budget_used)} / ${formatCurrency(itinerary.total_budget)}`,
    margin,
    y
  );
  y += 12;

  doc.setTextColor(0);

  for (const day of itinerary.days) {
    if (y > 260) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(day.date_label || `Day ${day.day}`, margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');

    for (const act of day.activities) {
      if (y > 270) {
        doc.addPage();
        y = margin;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${timeSlotLabel(act.time)} — ${act.name}`, margin, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      const lines = doc.splitTextToSize(act.description, 170);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 2;

      doc.text(`Est. cost: ${formatCurrency(act.estimated_cost)}`, margin, y);
      y += 8;
      doc.setTextColor(0);
    }

    y += 4;
  }

  const filename = `${tripName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_itinerary.pdf`;
  doc.save(filename);
}
