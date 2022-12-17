import { ChangeEvent } from 'react';
import styled from 'styled-components';

import { ReactComponent as SearchIcon } from '../../assets/svg/search-icon.svg';
import { Heading } from '../../components/Heading';
import { InputFieldWithIcon } from '../../components/Input';

type ControlBarProps = {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function ControlBar({ value, onChange }: ControlBarProps) {
  return (
    <TopSection>
      <Heading>Your Identities</Heading>
      <StyledInput
        id="domain-seach"
        isSimple={true}
        inputLogo={SearchIcon}
        placeholder="Search"
        content={value}
        onChange={onChange}
        style={{ maxWidth: '200px', background: 'none' }}
        isInvalidInput={false}
      />
    </TopSection>
  );
}

const TopSection = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const StyledInput = styled(InputFieldWithIcon)`
  max-width: 200px !important;
  display: flex !important;
  align-items: flex-start;
`;
