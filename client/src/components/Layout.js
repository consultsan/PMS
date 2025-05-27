import React, { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  Bars3Icon,
  XMarkIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Users', href: '/users', icon: UsersIcon },
  { name: 'Hospitals', href: '/hospitals', icon: BuildingOfficeIcon },
  { name: 'Leads', href: '/leads', icon: UsersIcon },
  { name: 'Download Leads', href: '/download-leads', icon: ClipboardDocumentListIcon, roles: ['ADMIN', 'SUPERADMIN'] },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  // Only show Dashboard for sales person
  const filteredNavigation = user && user.role === 'SALES_PERSON'
    ? navigation.filter(item => item.name === 'Dashboard')
    : user && user.role === 'PARTNER'
    ? navigation.filter(item => item.name !== 'Users' && item.name !== 'Hospitals' && item.name !== 'Download Leads')
    : user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN')
    ? navigation.filter(item => !item.roles || item.roles.includes(user.role))
    : navigation;

  return (
    <div className="min-h-screen bg-gray-100">
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-blue-700 px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center">
                    <img
                      className="h-32 w-auto"
                      src="/logo.png"
                      alt="TRUE Partner Management System"
                    />
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {filteredNavigation.map((item) => (
                            <li key={item.name}>
                              <Link
                                to={item.href}
                                className={`
                                  group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                                  ${location.pathname === item.href
                                    ? 'bg-blue-500 text-white'
                                    : 'text-white hover:bg-blue-500 hover:text-white'}
                                `}
                              >
                                <item.icon
                                  className={`h-6 w-6 shrink-0 ${location.pathname === item.href ? 'text-white' : 'text-blue-200 group-hover:text-white'}`}
                                  aria-hidden="true"
                                />
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-blue-700 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <img
              className="h-32 w-auto"
              src="/logo.png"
              alt="TRUE Partner Management System"
            />
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {filteredNavigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={`
                          group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                          ${location.pathname === item.href
                            ? 'bg-blue-500 text-white'
                            : 'text-white hover:bg-blue-500 hover:text-white'}
                        `}
                      >
                        <item.icon
                          className={`h-6 w-6 shrink-0 ${location.pathname === item.href ? 'text-white' : 'text-blue-200 group-hover:text-white'}`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-gray-200 text-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Profile dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className="-m-1.5 flex items-center p-1.5"
                  onClick={logout}
                >
                  <span className="sr-only">Logout</span>
                  <span className="hidden lg:flex lg:items-center">
                    <span className="ml-4 text-sm font-semibold leading-6 text-gray-900" aria-hidden="true">
                      {user?.firstName} {user?.lastName}
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}