'use client';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export default function PathnameProvider({path_of_file} : {path_of_file :string}) {
  const pathname = usePathname();
  path_of_file = pathname;
  return(
    <></>
  )
}