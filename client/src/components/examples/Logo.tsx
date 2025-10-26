import Logo from '../Logo';

export default function LogoExample() {
  return (
    <div className="flex flex-col gap-8 p-8">
      <Logo size="sm" />
      <Logo size="md" />
      <Logo size="lg" />
    </div>
  );
}
