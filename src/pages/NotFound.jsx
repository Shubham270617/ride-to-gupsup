import Button from "../components/ui/Button";

export default function NotFound() {
  return (
    <section className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <span className="font-display text-8xl md:text-9xl text-gradient mb-4">404</span>
      <h1 className="font-display text-3xl md:text-4xl mb-4">Off the Marked Route</h1>
      <p className="text-rtg-mist max-w-md mb-8">
        Looks like this trail doesn't exist. Let's get you back on course.
      </p>
      <Button to="/" size="lg">Back to Home</Button>
    </section>
  );
}
