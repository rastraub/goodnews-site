import { EmailSignup } from "@/components/email-signup";
import { siteConfig } from "@/site.config";

export function TeacherAnnouncementSignup() {
  return (
    <section className="page-block no-print" id="teachers">
      <div className="wrap prose-page">
        <h2>For teachers</h2>
        <p>
          The morning script is free to read at school, or to hand to a student announcer, with credit to {siteConfig.name}. {siteConfig.name} is published by {siteConfig.owner.name}.
        </p>
        <p>
          This email list is for adults and educators. It sends classroom notes to your own address. Do not enter a student&apos;s email. We do not ask for a child&apos;s name, age, or school.
        </p>
        <EmailSignup variant="inline" interest="teachers" id="teacher-email" />
      </div>
    </section>
  );
}
