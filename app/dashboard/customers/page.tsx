import { fetchCustomers } from '@/app/lib/data';
import Image from 'next/image';

const CustomersPage = async () => {
  const res = await fetchCustomers();

  console.log(res);

  return (
    <div>
      <h1>Customers</h1>

      <ul className="grid gap-2">
        {res.map((customer) => (
          <li key={customer.id}>
            <div className="grid grid-cols-2 items-center gap-2 md:grid-cols-3">
              <Image
                src={customer.image_url}
                width={60}
                height={60}
                alt={customer.name}
              />
              <p>{customer.name}</p>
              <p>{customer.email}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CustomersPage;
