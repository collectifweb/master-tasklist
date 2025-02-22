import { useRouter } from 'next/router';
import Logo from './Logo';

const Header = () => {
  const router = useRouter();

  return (
    <header id="main-header" className="w-full app-header">
      <div className="header-container flex justify-between items-center py-4 px-4 sm:px-6 lg:px-8">
        <div className="header-logo cursor-pointer" onClick={() => router.push("/")}>
          <Logo />
        </div>
      </div>
    </header>
  );
};

export default Header;