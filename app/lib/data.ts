import pool from './db-setup';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
  Customer,
} from './definitions';
import { formatCurrency } from './utils';

import { unstable_noStore as noStore } from 'next/cache';

export async function fetchRevenue() {
  // Add noStore() here to prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).

  /**
   * @note noStore() is unstable. It can be swapped for the stable Segment Config Option,
   * which will do the same thing but is applicable to a Page, Layout, or Route Handler.
   */
  noStore();

  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = (await pool.query(`SELECT * FROM revenue`)) as {
      rows: Revenue[];
    };

    console.log('Fetching revenue data is done.');

    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  /**
   * @note noStore() is unstable. It can be swapped for the stable Segment Config Option,
   * which will do the same thing but is applicable to a Page, Layout, or Route Handler.
   */
  noStore();

  try {

    console.log('Fetching latest invoices...');

    await new Promise((resolve) => setTimeout(resolve, 900));

    const data = (await pool.query(`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`)) as { rows: LatestInvoiceRaw[] };

    console.log('Fetching latest invoices is done.');

    const latestInvoices = data.rows.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  /**
   * @note noStore() is unstable. It can be swapped for the stable Segment Config Option,
   * which will do the same thing but is applicable to a Page, Layout, or Route Handler.
   */
  noStore();

  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const invoiceCountPromise = pool.query(`SELECT COUNT(*) FROM invoices`) as {
      rows: [{ count: string }];
    };
    const customerCountPromise = pool.query(
      `SELECT COUNT(*) FROM customers`,
    ) as {
      rows: [{ count: string }];
    };
    const invoiceStatusPromise = pool.query(`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`) as { rows: [{ paid: number; pending: number }] };

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0].rows[0].count ?? '0');
    const numberOfCustomers = Number(data[1].rows[0].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2].rows[0].paid ?? 0);
    const totalPendingInvoices = formatCurrency(data[2].rows[0].pending ?? 0);

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  /**
   * @note noStore() is unstable. It can be swapped for the stable Segment Config Option,
   * which will do the same thing but is applicable to a Page, Layout, or Route Handler.
   */
  noStore();

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = (await pool.query(`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE '${`%${query}%`}' OR
        customers.email ILIKE '${`%${query}%`}' OR
        invoices.amount::text ILIKE '${`%${query}%`}' OR
        invoices.date::text ILIKE '${`%${query}%`}' OR
        invoices.status ILIKE '${`%${query}%`}'
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `)) as { rows: InvoicesTable[] };

    return invoices.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  /**
   * @note noStore() is unstable. It can be swapped for the stable Segment Config Option,
   * which will do the same thing but is applicable to a Page, Layout, or Route Handler.
   */
  noStore();

  try {
    const count = (await pool.query(`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE '${`%${query}%`}' OR
      customers.email ILIKE '${`%${query}%`}' OR
      invoices.amount::text ILIKE '${`%${query}%`}' OR
      invoices.date::text ILIKE '${`%${query}%`}' OR
      invoices.status ILIKE '${`%${query}%`}'
  `)) as { rows: [{ count: string }] };

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  /**
   * @note noStore() is unstable. It can be swapped for the stable Segment Config Option,
   * which will do the same thing but is applicable to a Page, Layout, or Route Handler.
   */
  noStore();

  try {
    const data = (await pool.query(`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = '${id}';
    `)) as { rows: InvoicesTable[] };

    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  /**
   * @note noStore() is unstable. It can be swapped for the stable Segment Config Option,
   * which will do the same thing but is applicable to a Page, Layout, or Route Handler.
   */
  noStore();

  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const data = (await pool.query(`
      SELECT
        id,
        name
        email,
        image_url
      FROM customers
      ORDER BY name ASC
    `)) as { rows: Customer[] };

    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  /**
   * @note noStore() is unstable. It can be swapped for the stable Segment Config Option,
   * which will do the same thing but is applicable to a Page, Layout, or Route Handler.
   */
  noStore();

  try {
    const data = (await pool.query(`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE '${`%${query}%`}' OR
        customers.email ILIKE '${`%${query}%`}'
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `)) as { rows: CustomersTableType[] };

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

// export async function getUser(email: string) {
//   try {
//     const user = await pool.query(`SELECT * FROM users WHERE email=${email}`);
//     return user.rows[0] as User;
//   } catch (error) {
//     console.error('Failed to fetch user:', error);
//     throw new Error('Failed to fetch user.');
//   }
// }
