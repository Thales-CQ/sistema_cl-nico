import PatientList from "./components/PatientList";
import PatientTable from "./components/PatientTable";
import usePatientListStatus from "./hooks/usePatientListStatus";

export default function PatientListFeature(props) {
  const tableContent = props.patients.length > 0 ? (
    <PatientTableFeature props={props} />
  ) : null;
  return <PatientList {...props} tableContent={tableContent} />;
}

function PatientTableFeature({ props }) {
  const status = usePatientListStatus({
    onStatusUpdated: props.onStatusUpdated,
    canEdit: props.canEdit,
    canChangeStatus: props.canChangeStatus,
  });
  return <PatientTable patients={props.patients} onEditPatient={props.onEditPatient}
    canEdit={props.canEdit} status={status} />;
}
