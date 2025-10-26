import CustomerTag from '../CustomerTag';

export default function CustomerTagExample() {
  return (
    <div className="flex flex-wrap gap-2 p-8">
      <CustomerTag label="不读不回" type="status" />
      <CustomerTag label="已读不回" type="status" />
      <CustomerTag label="进群" type="status" />
      <CustomerTag label="股民" type="learning" />
      <CustomerTag label="小白" type="learning" />
      <CustomerTag label="跟票1" type="learning" onRemove={() => console.log('Remove tag')} />
      <CustomerTag label="热聊" type="conversion" />
      <CustomerTag label="开户" type="conversion" selected />
      <CustomerTag label="入金" type="conversion" onRemove={() => console.log('Remove tag')} />
    </div>
  );
}
