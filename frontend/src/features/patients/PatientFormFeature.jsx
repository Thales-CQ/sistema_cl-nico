import PatientForm from "./components/PatientForm";
import usePatientForm from "./hooks/usePatientForm";

export default function PatientFormFeature(props) {
  const form = usePatientForm(props);
  return <PatientForm form={form} busy={props.busy} onCancel={props.onCancel} extraActions={props.extraActions} />;
}
