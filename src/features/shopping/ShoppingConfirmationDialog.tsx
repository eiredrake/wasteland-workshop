import ConfirmationDialog from '../../components/ConfirmationDialog/ConfirmationDialog'
export default function ShoppingConfirmationDialog(props: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void
}) { return <ConfirmationDialog {...props} confirmLabel="Remove" /> }
