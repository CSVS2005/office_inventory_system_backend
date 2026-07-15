import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

function buildReportFilter(req: Request) {
  const filter: any = { owner_id: req.user!.owner_id };
  if (typeof req.query.status === 'string' && req.query.status.trim()) {
    filter.status = req.query.status;
  }
  if (typeof req.query.from === 'string' && req.query.from.trim()) {
    filter.inventory_date = { gte: new Date(req.query.from) };
  }
  if (typeof req.query.to === 'string' && req.query.to.trim()) {
    const toDate = new Date(req.query.to);
    toDate.setHours(23, 59, 59, 999);
    filter.inventory_date = filter.inventory_date
      ? { ...filter.inventory_date, lte: toDate }
      : { lte: toDate };
  }
  return filter;
}

async function fetchInventoryReport(req: Request) {
  const filter = buildReportFilter(req);
  return prisma.inventory.findMany({
    where: filter,
    orderBy: { inventory_date: 'desc' },
    include: { personnel: true },
  });
}

export async function getInventoryReport(req: Request, res: Response) {
  const items = await fetchInventoryReport(req);
  return res.json({ items });
}

export async function getDeviceStatusReport(req: Request, res: Response) {
  const counts = await prisma.inventory.groupBy({
    by: ['status'],
    where: { owner_id: req.user!.owner_id },
    _count: { status: true },
  });

  const summary = counts.reduce((acc, item) => {
    acc[item.status] = item._count.status;
    return acc;
  }, {} as Record<string, number>);

  return res.json({ statusCounts: summary });
}

export async function exportInventoryExcel(req: Request, res: Response) {
  const items = await fetchInventoryReport(req);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Inventory Report');

  sheet.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Personnel', key: 'personnel', width: 24 },
    { header: 'Brand/Model', key: 'brand_model', width: 32 },
    { header: 'Serial', key: 'serial_number', width: 24 },
    { header: 'Property No', key: 'property_number', width: 18 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Inventory Date', key: 'inventory_date', width: 20 },
    { header: 'Processor', key: 'processor', width: 24 },
    { header: 'RAM', key: 'ram', width: 16 },
    { header: 'OS', key: 'operating_system', width: 24 },
    { header: 'Remarks', key: 'remarks', width: 32 },
  ];

  items.forEach((item) => {
    sheet.addRow({
      id: item.id,
      personnel: item.personnel ? `${item.personnel.first_name} ${item.personnel.surname}` : '-',
      brand_model: item.brand_model,
      serial_number: item.serial_number,
      property_number: item.property_number || '',
      status: item.status,
      inventory_date: item.inventory_date.toISOString().split('T')[0],
      processor: item.processor || '',
      ram: item.ram || '',
      operating_system: item.operating_system || '',
      remarks: item.remarks || '',
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
}

export async function exportInventoryPdf(req: Request, res: Response) {
  const items = await fetchInventoryReport(req);
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.pdf"');

  doc.pipe(res);
  doc.fontSize(18).text('Inventory Report', { underline: true });
  doc.moveDown(1);

  items.forEach((item) => {
    doc.fontSize(12).text(`ID: ${item.id}`);
    doc.text(`Personnel: ${item.personnel ? `${item.personnel.first_name} ${item.personnel.surname}` : 'N/A'}`);
    doc.text(`Brand/Model: ${item.brand_model}`);
    doc.text(`Serial Number: ${item.serial_number}`);
    doc.text(`Status: ${item.status}`);
    doc.text(`Property Number: ${item.property_number || '-'}`);
    doc.text(`Inventory Date: ${item.inventory_date.toISOString().split('T')[0]}`);
    doc.text(`Operating System: ${item.operating_system || '-'}`);
    doc.text(`Remarks: ${item.remarks || '-'}`);
    doc.moveDown(0.5);
    doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(0.5);
  });

  doc.end();
}
