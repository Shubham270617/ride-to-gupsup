import FeatureSwitch from "../components/FeatureSwitch";
import VolunteerAdmin from "./VolunteerAdmin";
import { FEATURE_KEYS } from "../../lib/features";

// Admin -> Volunteer roles: the switch that shows or hides the public RTG
// Crew page, above Randeep's role editor.
export default function VolunteerRolesAdmin() {
  return (
    <>
      <FeatureSwitch
        settingKey={FEATURE_KEYS.volunteer}
        title="Show the RTG Crew page"
        onText="Live: /volunteer is open and “Volunteer” is in the menu."
        offText="Hidden: visitors can't open /volunteer and there's no menu link."
      />
      <VolunteerAdmin persistenceEnabled />
    </>
  );
}
