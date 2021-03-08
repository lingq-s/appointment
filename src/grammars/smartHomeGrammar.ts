export const grammar = `
<grammar root="command">

   <rule id="command">
      <item repeat="0-1">please</item>
      <item repeat="0-1">
      turn the
        <ruleref uri="#object1"/>
        <ruleref uri="#action"/>
        <tag>out.object=rules.object1.type;</tag>
        <tag>out.action=rules.action.type;</tag>
      </item>

      <item repeat="0-1">
        turn <ruleref uri="#action"/>
        the <ruleref uri="#object1"/>
        <tag>out.object=rules.object1.type;</tag>
        <tag>out.action=rules.action.type;</tag>
      </item>

      <item repeat="0-1">
        <ruleref uri="#action"/>
        the <ruleref uri="#object2"/>
        <tag>out.object=rules.object2.type;</tag>
        <tag>out.action=rules.action.type;</tag>
      </item>
      <item repeat="0-1">please</item>
   </rule>

   <rule id="kindofaction">
      <one-of>
         <item>off</item>
         <item>on</item>
         <item>open</item>
         <item>close</item>
      </one-of>
   </rule>

<rule id="kindofobject1">
  <one-of>
     <item> light </item>
     <item> heat </item>
     <item> A C <tag> out = 'air conditioning'; </tag></item>
     <item> air conditioning </item>
  </one-of>
</rule>

<rule id="kindofobject2">
  <one-of>
     <item> window </item>
     <item> door </item>
  </one-of>
</rule>

   <rule id="action">
      <ruleref uri="#kindofaction"/>
      <tag>out.type=rules.kindofaction;</tag>
   </rule>

   <rule id="object1">
      <ruleref uri="#kindofobject1"/>
      <tag>out.type=rules.kindofobject1;</tag>
   </rule>

   <rule id="object2">
      <ruleref uri="#kindofobject2"/>
      <tag>out.type=rules.kindofobject2;</tag>
   </rule>

</grammar>
`
